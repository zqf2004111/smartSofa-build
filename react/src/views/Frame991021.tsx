import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991021.css";
const Frame991021 = () => {
    const navigate = useNavigate();

    const click_99_1022 = () => {
        navigate(getPathByGuid("94:196"), {
            state: {
                from: "99:1022",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div id="99_1021" className="Pixso-frame-99_1021">
                <div
                    id="99_1022"
                    className="Pixso-rectangle-99_1022"
                    onClick={withStopPropagation(click_99_1022)}
                ></div>
                <div id="99_1023" className="Pixso-vector-99_1023"></div>
                <p id="99_1025" className="Pixso-paragraph-99_1025">
                    {"Massage"}
                </p>
            </div>
        </div>
    );
};
export default Frame991021;

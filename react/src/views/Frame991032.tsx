import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991032.css";
const Frame991032 = () => {
    const navigate = useNavigate();

    const click_99_1033 = () => {
        navigate(getPathByGuid("94:1196"), {
            state: {
                from: "99:1033",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div id="99_1032" className="Pixso-frame-99_1032">
                <div
                    id="99_1033"
                    className="Pixso-vector-99_1033"
                    onClick={withStopPropagation(click_99_1033)}
                ></div>
                <div id="99_1034" className="Pixso-vector-99_1034"></div>
                <p id="99_1036" className="Pixso-paragraph-99_1036">
                    {"Ventilation"}
                </p>
            </div>
        </div>
    );
};
export default Frame991032;

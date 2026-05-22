import { useNavigate } from "react-router";
import { getPathByGuid } from "@/router/routes";
import { withStopPropagation } from "@/utils/utils";
import "@/styles/Frame991486.css";
const Frame991486 = () => {
    const navigate = useNavigate();

    const click_99_1495 = () => {
        navigate(getPathByGuid("0:0"), {
            state: {
                from: "99:1495",
                et: "c"
            }
        });
    };

    return (
        <div className="scroll-container">
            <div id="99_1486" className="Pixso-frame-99_1486">
                <div className="frame-content-99_1486">
                    <div id="99_1487" className="Pixso-frame-99_1487">
                        <div className="frame-content-99_1487">
                            <div id="99_1488" className="Pixso-frame-99_1488">
                                <div
                                    id="99_1489"
                                    className="Pixso-vector-99_1489"
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div
                        id="99_1495"
                        className="Pixso-frame-99_1495"
                        onClick={withStopPropagation(click_99_1495)}
                    >
                        <div className="frame-content-99_1495">
                            <div id="99_1496" className="Pixso-frame-99_1496">
                                <div className="frame-content-99_1496">
                                    <div
                                        id="99_1497"
                                        className="Pixso-vector-99_1497"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Frame991486;
